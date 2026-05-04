const { SlashCommandBuilder } = require("discord.js");
const { removeMoney } = require("../lib/economyStore");
const { resolveMemberFromOptions } = require("../lib/memberResolver");
const { formatMoney } = require("../lib/format");
const { ensureEconomyAdmin } = require("../lib/access");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply
} = require("../lib/ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removemoney")
    .setDescription("Kullanicinin bakiyesinden para duser. (Yetkili)")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Dusulecek miktar")
        .setRequired(true)
        .setMinValue(1)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Kullanici sec")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!(await ensureEconomyAdmin(interaction))) {
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const resolved = await resolveMemberFromOptions(interaction, {
      required: true
    });

    if (!resolved.member) {
      const notFoundEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Kullanici Bulunamadi`,
        description: resolved.error || "Kullanici bulunamadi.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(notFoundEmbed, true));
      return;
    }

    const target = resolved.member;

    if (target.user.bot) {
      const botUserEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Gecersiz Hedef`,
        description: "Bot kullanicilarindan bakiye dusulemez.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(botUserEmbed, true));
      return;
    }

    const updated = removeMoney(
      interaction.guildId,
      target.id,
      target.displayName,
      amount
    );

    const summary = createAsciiBox([
      `${ICONS.money} Dusulen : ${formatMoney(updated.removed)}`,
      `${ICONS.wallet} Bakiye  : ${formatMoney(updated.balance)}`
    ]);

    const successEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.ok} Para Dusuldu`,
      description: `${target} hesabindan bakiye dusuldu.\n\n${summary}`,
      color: COLORS.success,
      thumbnailUser: target.user
    });

    await interaction.reply(asReply(successEmbed, true));
  }
};
