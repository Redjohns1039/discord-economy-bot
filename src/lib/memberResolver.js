async function resolveMemberFromOptions(interaction, options = {}) {
  const { allowSelfFallback = false, required = true } = options;
  const userOption = interaction.options.getUser("user");

  if (userOption) {
    const byId = await interaction.guild.members.fetch(userOption.id).catch(() => null);

    if (byId) {
      return { member: byId };
    }

    return {
      member: null,
      error: "Secilen kullanici sunucuda bulunamadi."
    };
  }

  if (allowSelfFallback) {
    const selfMember = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);

    if (selfMember) {
      return { member: selfMember };
    }

    if (interaction.member?.user) {
      return { member: interaction.member };
    }
  }

  if (required) {
    return {
      member: null,
      error: "Bir kullanici secmelisin (user)."
    };
  }

  return { member: null };
}

module.exports = {
  resolveMemberFromOptions
};
