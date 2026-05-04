const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder
} = require("discord.js");
const { listAllBalances } = require("../lib/economyStore");
const { formatMoney } = require("../lib/format");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply,
  rankIcon
} = require("../lib/ui");

function clampPageSize(rawValue) {
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    return 7;
  }

  return Math.max(3, Math.min(15, Math.floor(value)));
}

function shortenName(name, maxLength = 18) {
  const value = String(name || "Bilinmeyen");

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function createLeaderboardRow(sessionId, page, totalPages, lockAll = false) {
  const prevButton = new ButtonBuilder()
    .setCustomId(`lb_prev_${sessionId}`)
    .setLabel("Geri")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(lockAll || page <= 0);

  const pageButton = new ButtonBuilder()
    .setCustomId(`lb_page_${sessionId}`)
    .setLabel(`Sayfa ${page + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId(`lb_next_${sessionId}`)
    .setLabel("Ileri")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(lockAll || page >= totalPages - 1);

  return new ActionRowBuilder().addComponents(prevButton, pageButton, nextButton);
}

function createLeaderboardEmbed(interaction, entries, page, pageSize) {
  const totalPages = Math.ceil(entries.length / pageSize);
  const start = page * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  const boardLines = pageEntries.map((entry, index) => {
    const rank = start + index;
    return `${rankIcon(rank)} ${shortenName(entry.lastKnownName)} | ${formatMoney(entry.balance)}`;
  });

  const pageTotal = pageEntries.reduce((sum, entry) => sum + entry.balance, 0);
  const detailRaw = pageEntries
    .map((entry, index) => {
      const rank = start + index;
      return `${rankIcon(rank)} <@${entry.userId}> - ${formatMoney(entry.balance)}`;
    })
    .join("\n");

  const detail = detailRaw.length > 1000 ? `${detailRaw.slice(0, 970)}\n...` : detailRaw;

  return createEconomyEmbed({
    interaction,
    title: `${ICONS.crown} Leaderboard`,
    description: createAsciiBox(boardLines),
    color: COLORS.money,
    fields: [
      {
        name: `${ICONS.chart} Sayfa`,
        value: `**${page + 1}/${totalPages}** | Oyuncu: **${entries.length}**`,
        inline: true
      },
      {
        name: `${ICONS.money} Bu Sayfa Toplami`,
        value: `${formatMoney(pageTotal)}`,
        inline: true
      },
      {
        name: `${ICONS.info} Oyuncu Listesi`,
        value: detail || "Liste bos."
      }
    ]
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Tum kullanicilarin bakiye siralamasini gosterir.")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Sayfa basina kisi sayisi (3-15)")
        .setMinValue(3)
        .setMaxValue(15)
    ),

  async execute(interaction) {
    const pageSize = clampPageSize(interaction.options.getInteger("limit") || 7);
    const leaderboard = listAllBalances(interaction.guildId);

    if (leaderboard.length === 0) {
      const emptyEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.chart} Leaderboard`,
        description: "Listelenecek bakiye bulunamadi.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(emptyEmbed, true));
      return;
    }

    const totalPages = Math.ceil(leaderboard.length / pageSize);
    let currentPage = 0;
    const sessionId = `${interaction.id}_${Date.now().toString(36)}`;

    const initialEmbed = createLeaderboardEmbed(
      interaction,
      leaderboard,
      currentPage,
      pageSize
    );

    await interaction.reply({
      embeds: [initialEmbed],
      components:
        totalPages > 1
          ? [createLeaderboardRow(sessionId, currentPage, totalPages)]
          : []
    });

    if (totalPages <= 1) {
      return;
    }

    const replyMessage = await interaction.fetchReply();
    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180000
    });

    collector.on("collect", async (buttonInteraction) => {
      if (!buttonInteraction.customId.endsWith(sessionId)) {
        return;
      }

      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: "Bu paneli sadece komutu kullanan kisi yonetebilir.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (buttonInteraction.customId.startsWith("lb_prev_")) {
        currentPage = Math.max(0, currentPage - 1);
      }

      if (buttonInteraction.customId.startsWith("lb_next_")) {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      const nextEmbed = createLeaderboardEmbed(
        interaction,
        leaderboard,
        currentPage,
        pageSize
      );

      await buttonInteraction.update({
        embeds: [nextEmbed],
        components: [createLeaderboardRow(sessionId, currentPage, totalPages)]
      });
    });

    collector.on("end", async () => {
      try {
        await replyMessage.edit({
          components: [createLeaderboardRow(sessionId, currentPage, totalPages, true)]
        });
      } catch {
        // Mesaj silinmis veya duzenlenemiyor olabilir.
      }
    });
  }
};
