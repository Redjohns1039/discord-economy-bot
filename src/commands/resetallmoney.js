const { SlashCommandBuilder } = require("discord.js");
const { resetAllBalances } = require("../lib/economyStore");
const { formatMoney } = require("../lib/format");
const { ensureEconomyAdmin } = require("../lib/access");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply
} = require("../lib/ui");

const RESET_CONFIRM_CODE = "SIFIRLA";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetallmoney")
    .setDescription("Sunucudaki tum kullanicilarin bakiyesini sifirlar. (Yetkili)")
    .addBooleanOption((option) =>
      option
        .setName("onay")
        .setDescription("Sifirlama icin true sec")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("kod")
        .setDescription(`Guvenlik kodunu gir: ${RESET_CONFIRM_CODE}`)
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!(await ensureEconomyAdmin(interaction))) {
      return;
    }

    const confirm = interaction.options.getBoolean("onay", true);
    const code = interaction.options.getString("kod", true).trim().toUpperCase();

    if (!confirm) {
      const warningEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Onay Gerekli`,
        description:
          `Bu komut tum kullanicilarin bakiyesini sifirlar. Devam etmek icin onay secenegini true yap ve kod alanina ${RESET_CONFIRM_CODE} yaz.`,
        color: COLORS.warning
      });

      await interaction.reply(asReply(warningEmbed, true));
      return;
    }

    if (code !== RESET_CONFIRM_CODE) {
      const codeEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Guvenlik Kodu Hatali`,
        description: `Sifirlama icin kod alanina ${RESET_CONFIRM_CODE} yazmalisin.`,
        color: COLORS.warning
      });

      await interaction.reply(asReply(codeEmbed, true));
      return;
    }

    const result = resetAllBalances(interaction.guildId);

    if (result.processedUsers === 0) {
      const emptyEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.info} Kayit Bulunamadi`,
        description: "Sifirlanacak ekonomi kaydi bulunamadi.",
        color: COLORS.info
      });

      await interaction.reply(asReply(emptyEmbed, true));
      return;
    }

    const summary = createAsciiBox([
      `${ICONS.user} Toplam Kullanici : ${result.processedUsers}`,
      `${ICONS.ok} Sifirlanan       : ${result.resetUsers}`,
      `${ICONS.money} Silinen Toplam  : ${formatMoney(result.totalRemoved)}`
    ]);

    const title =
      result.resetUsers > 0
        ? `${ICONS.ok} Tum Bakiyeler Sifirlandi`
        : `${ICONS.info} Bakiyeler Zaten Sifirdi`;

    const color = result.resetUsers > 0 ? COLORS.success : COLORS.info;

    const successEmbed = createEconomyEmbed({
      interaction,
      title,
      description: `Toplu sifirlama islemi tamamlandi.\n\n${summary}`,
      color
    });

    await interaction.reply(asReply(successEmbed, true));
  }
};
