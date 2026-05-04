const { SlashCommandBuilder } = require("discord.js");
const { addMoney } = require("../lib/economyStore");
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
    .setName("addmoney")
    .setDescription("Kullanicinin bakiyesine para ekler. (Yetkili)")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Eklenecek miktar")
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
        description: "Bot kullanicilarina bakiye eklenemez.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(botUserEmbed, true));
      return;
    }

    const updated = addMoney(interaction.guildId, target.id, target.displayName, amount);

    const summary = createAsciiBox([
      `${ICONS.money} Eklenen : ${formatMoney(amount)}`,
      `${ICONS.wallet} Bakiye  : ${formatMoney(updated.balance)}`
    ]);

    const successEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.ok} Para Eklendi`,
      description: `${target} hesabina bakiye eklendi.\n\n${summary}`,
      color: COLORS.success,
      thumbnailUser: target.user
    });

    await interaction.reply(asReply(successEmbed, true));
  }
};
