const { SlashCommandBuilder } = require("discord.js");
const { setMoney } = require("../lib/economyStore");
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
    .setName("setmoney")
    .setDescription("Kullanicinin bakiyesini dogrudan ayarlar. (Yetkili)")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Yeni bakiye")
        .setRequired(true)
        .setMinValue(0)
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
        description: "Bot kullanicilarinin bakiyesi ayarlanamaz.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(botUserEmbed, true));
      return;
    }

    const updated = setMoney(interaction.guildId, target.id, target.displayName, amount);

    const summary = createAsciiBox([
      `${ICONS.wallet} Yeni Bakiye : ${formatMoney(updated.balance)}`
    ]);

    const successEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.ok} Bakiye Ayarlandi`,
      description: `${target} hesabinin bakiyesi guncellendi.\n\n${summary}`,
      color: COLORS.success,
      thumbnailUser: target.user
    });

    await interaction.reply(asReply(successEmbed, true));
  }
};
