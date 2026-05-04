const { EmbedBuilder, MessageFlags } = require("discord.js");

const ICONS = {
  money: "\uD83D\uDCB0",
  wallet: "\uD83D\uDC5D",
  bank: "\uD83C\uDFE6",
  crown: "\uD83D\uDC51",
  chart: "\uD83D\uDCCA",
  user: "\uD83D\uDC64",
  ok: "\u2705",
  warn: "\u26A0\uFE0F",
  info: "\u2139\uFE0F"
};

const COLORS = {
  money: 0xf4b400,
  success: 0x2ea043,
  info: 0x1f6feb,
  warning: 0xfb8500,
  danger: 0xd73a49
};

function createAsciiBox(lines) {
  const normalized = lines.map((line) => String(line));
  const width = normalized.reduce((max, line) => Math.max(max, line.length), 0);
  const border = `+${"-".repeat(width + 2)}+`;
  const body = normalized.map((line) => `| ${line.padEnd(width, " ")} |`);

  return ["```txt", border, ...body, border, "```"].join("\n");
}

function createEconomyEmbed({
  interaction,
  title,
  description,
  fields = [],
  color = COLORS.info,
  thumbnailUser
}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: `${ICONS.money} Yetost Economy` });

  if (description) {
    embed.setDescription(description);
  }

  if (Array.isArray(fields) && fields.length > 0) {
    embed.addFields(fields);
  }

  if (interaction?.guild?.name) {
    const guildIcon = interaction.guild.iconURL();
    if (guildIcon) {
      embed.setAuthor({
        name: interaction.guild.name,
        iconURL: guildIcon
      });
    } else {
      embed.setAuthor({ name: interaction.guild.name });
    }
  }

  if (thumbnailUser && typeof thumbnailUser.displayAvatarURL === "function") {
    embed.setThumbnail(thumbnailUser.displayAvatarURL({ size: 256 }));
  }

  return embed;
}

function asReply(embed, ephemeral = false) {
  const payload = { embeds: [embed] };

  if (ephemeral) {
    payload.flags = MessageFlags.Ephemeral;
  }

  return payload;
}

function rankIcon(index) {
  if (index === 0) {
    return "\uD83E\uDD47";
  }

  if (index === 1) {
    return "\uD83E\uDD48";
  }

  if (index === 2) {
    return "\uD83E\uDD49";
  }

  return `${index + 1}.`;
}

module.exports = {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply,
  rankIcon
};
