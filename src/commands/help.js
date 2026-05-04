const { SlashCommandBuilder } = require("discord.js");
const { ensureEconomyAdmin, getEconomyAdminRoleId } = require("../lib/access");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply
} = require("../lib/ui");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Komutlari ve yetki dagilimini gosterir."),

  async execute(interaction) {
    if (!(await ensureEconomyAdmin(interaction))) {
      return;
    }

    const roleId = getEconomyAdminRoleId();
    const publicLines = [
      "/balance [user]",
      "/givemoney <amount> <user>",
      "/leaderboard [limit]"
    ];

    const adminLines = [
      "/addmoney <amount> <user>",
      "/removemoney <amount> <user>",
      "/setmoney <amount> <user>",
      "/splitmoney <amount> [message_id]",
      "/resetallmoney <onay:true> <kod:SIFIRLA>"
    ];

    const detailLines = [
      "/balance: Kendi veya hedef kullanicinin bakiyesini gosterir.",
      "/givemoney: Baska bir kullaniciya para transfer eder.",
      "/leaderboard: Butonlu sayfalarla en zenginleri listeler.",
      "/splitmoney: Belirlenen listeden kullanicilara esit para dagitir.",
      "/addmoney, /removemoney, /setmoney, /splitmoney, /resetallmoney: Sadece yetkili role aciktir.",
      "/resetallmoney komutunda ikinci onay olarak kod alanina SIFIRLA yazilmalidir."
    ];

    const roleText = roleId
      ? `Yetkili rol: <@&${roleId}>`
      : "Yetkili rol tanimli degil. .env icine ECONOMY_ADMIN_ROLE_ID eklemelisin.";

    const embed = createEconomyEmbed({
      interaction,
      title: `${ICONS.info} Komut Rehberi`,
      description: createAsciiBox([
        "Herkesin kullanabildigi komutlar:",
        ...publicLines
      ]),
      color: COLORS.info,
      fields: [
        {
          name: `${ICONS.crown} Yetkili Komutlar`,
          value: adminLines.join("\n")
        },
        {
          name: `${ICONS.chart} Aciklamalar`,
          value: detailLines.join("\n")
        },
        {
          name: `${ICONS.money} Yetki Bilgisi`,
          value: roleText
        }
      ]
    });

    await interaction.reply(asReply(embed, true));
  }
};
