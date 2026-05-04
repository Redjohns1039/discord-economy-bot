const { ICONS, COLORS, createEconomyEmbed, asReply } = require("./ui");

function getEconomyAdminRoleId() {
  return (process.env.ECONOMY_ADMIN_ROLE_ID || "").trim();
}

function hasRole(member, roleId) {
  if (!member?.roles) {
    return false;
  }

  if (member.roles.cache?.has) {
    return member.roles.cache.has(roleId);
  }

  if (Array.isArray(member.roles)) {
    return member.roles.includes(roleId);
  }

  return false;
}

async function ensureEconomyAdmin(interaction) {
  const roleId = getEconomyAdminRoleId();

  if (!roleId) {
    const configEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.warn} Yetki Ayari Eksik`,
      description:
        "ECONOMY_ADMIN_ROLE_ID ayari bulunamadi. .env dosyasina yetkili rol IDsini ekle.",
      color: COLORS.warning
    });

    await interaction.reply(asReply(configEmbed, true));
    return false;
  }

  if (hasRole(interaction.member, roleId)) {
    return true;
  }

  const deniedEmbed = createEconomyEmbed({
    interaction,
    title: `${ICONS.warn} Yetkisiz Komut`,
    description: `Bu komutu kullanmak icin <@&${roleId}> rolune sahip olmalisin.`,
    color: COLORS.warning
  });

  await interaction.reply(asReply(deniedEmbed, true));
  return false;
}

module.exports = {
  ensureEconomyAdmin,
  getEconomyAdminRoleId
};
