const { SlashCommandBuilder } = require("discord.js");
const { pay } = require("../lib/economyStore");
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
    .setName("givemoney")
    .setDescription("Baska bir kullaniciya para gonderir.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Gonderilecek miktar")
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

    const receiverMember = resolved.member;

    if (receiverMember.user.bot) {
      const botUserEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Gecersiz Hedef`,
        description: "Bot kullanicilarina para gonderemezsin.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(botUserEmbed, true));
      return;
    }

    const result = pay(
      interaction.guildId,
      {
        id: interaction.user.id,
        displayName: interaction.member.displayName || interaction.user.username
      },
      {
        id: receiverMember.id,
        displayName: receiverMember.displayName || receiverMember.user.username
      },
      amount
    );

    if (!result.ok) {
      if (result.reason === "SELF_PAYMENT") {
        const selfPayEmbed = createEconomyEmbed({
          interaction,
          title: `${ICONS.warn} Gecersiz Islem`,
          description: "Kendine para gonderemezsin.",
          color: COLORS.warning
        });

        await interaction.reply(asReply(selfPayEmbed, true));
        return;
      }

      const insufficientEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Yetersiz Bakiye`,
        description: `Mevcut bakiyen: ${formatMoney(result.sender.balance)}`,
        color: COLORS.warning
      });

      await interaction.reply(asReply(insufficientEmbed, true));
      return;
    }

    const summary = createAsciiBox([
      `${ICONS.money} Gonderilen   : ${formatMoney(result.amount)}`,
      `${ICONS.wallet} Yeni Bakiyen: ${formatMoney(result.sender.balance)}`
    ]);

    const successEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.ok} Para Gonderildi`,
      description: `${receiverMember} kullanicisina para gonderdin.\n\n${summary}`,
      color: COLORS.success,
      thumbnailUser: interaction.user
    });

    await interaction.reply(asReply(successEmbed));
  }
};
