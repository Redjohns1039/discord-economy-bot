const { SlashCommandBuilder } = require("discord.js");
const { getBalance } = require("../lib/economyStore");
const { resolveMemberFromOptions } = require("../lib/memberResolver");
const { formatMoney } = require("../lib/format");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply
} = require("../lib/ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Kendi veya secilen kullanicinin bakiyesini gosterir.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Kullanici sec (opsiyonel)")
    ),

  async execute(interaction) {
    const resolved = await resolveMemberFromOptions(interaction, {
      allowSelfFallback: true,
      required: false
    });

    if (!resolved.member) {
      const errorEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Kullanici Bulunamadi`,
        description: resolved.error || "Kullanici bulunamadi.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(errorEmbed, true));
      return;
    }

    const target = resolved.member;
    const balance = getBalance(interaction.guildId, target.id, target.displayName);

    const card = createAsciiBox([
      `${ICONS.wallet} Bakiye : ${formatMoney(balance.balance)}`
    ]);

    const embed = createEconomyEmbed({
      interaction,
      title: `${ICONS.money} Check Balance`,
      description: `${target} kullanicisinin bakiye karti\n\n${card}`,
      color: COLORS.money,
      thumbnailUser: target.user
    });

    await interaction.reply(asReply(embed));
  }
};
