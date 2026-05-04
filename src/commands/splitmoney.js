const { SlashCommandBuilder } = require("discord.js");
const { addMoney } = require("../lib/economyStore");
const { formatMoney } = require("../lib/format");
const { ensureEconomyAdmin } = require("../lib/access");
const {
  ICONS,
  COLORS,
  createAsciiBox,
  createEconomyEmbed,
  asReply
} = require("../lib/ui");

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getDistributionChannelId() {
  return (process.env.ECONOMY_DISTRIBUTION_CHANNEL_ID || "").trim();
}

function getMessageListText(message) {
  const parts = [];

  if (typeof message?.content === "string" && message.content.trim()) {
    parts.push(message.content);
  }

  for (const embed of message?.embeds || []) {
    if (typeof embed?.description === "string" && embed.description.trim()) {
      parts.push(embed.description);
    }

    for (const field of embed?.fields || []) {
      if (typeof field?.value === "string" && field.value.trim()) {
        parts.push(field.value);
      }
    }
  }

  return parts.join("\n").trim();
}

function extractCandidateFromLine(line) {
  const atIndex = line.indexOf("@");
  if (atIndex === -1) {
    return null;
  }

  let candidate = line.slice(atIndex + 1).trim();

  if (!candidate || candidate.startsWith("<@")) {
    return null;
  }

  if (candidate.includes("/")) {
    candidate = candidate.split("/")[0].trim();
  }

  candidate = candidate.replace(/^[!#]+/g, "").trim();

  candidate = candidate.replace(/[,:;]+$/g, "").trim();

  return candidate || null;
}

function resolveByName(candidate, members) {
  const normalizedCandidate = normalizeLookup(candidate);

  if (!normalizedCandidate) {
    return { status: "invalid" };
  }

  const exactMatches = members.filter((member) => {
    const fields = [
      member.displayName,
      member.user.username,
      member.user.globalName,
      member.user.tag
    ]
      .filter(Boolean)
      .map(normalizeLookup);

    return fields.includes(normalizedCandidate);
  });

  if (exactMatches.length === 1) {
    return { status: "found", member: exactMatches[0] };
  }

  if (exactMatches.length > 1) {
    return { status: "ambiguous", candidate };
  }

  const partialMatches = members.filter((member) => {
    const fields = [
      member.displayName,
      member.user.username,
      member.user.globalName,
      member.user.tag
    ]
      .filter(Boolean)
      .map(normalizeLookup);

    return fields.some((field) => field.includes(normalizedCandidate));
  });

  if (partialMatches.length === 1) {
    return { status: "found", member: partialMatches[0] };
  }

  if (partialMatches.length > 1) {
    return { status: "ambiguous", candidate };
  }

  return { status: "not_found", candidate };
}

async function getSourceMessage(interaction, messageId) {
  if (!interaction.channel || !interaction.channel.isTextBased()) {
    return null;
  }

  if (messageId) {
    return interaction.channel.messages.fetch(messageId).catch(() => null);
  }

  const messages = await interaction.channel.messages.fetch({ limit: 30 });

  return (
    messages.find((message) => {
      if (message.author.bot) {
        return false;
      }

      const hasAtInText = getMessageListText(message).includes("@");
      const hasMentions = (message.mentions?.users?.size || 0) > 0;

      return hasAtInText || hasMentions;
    }) ||
    null
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("splitmoney")
    .setDescription("Liste mesajindaki kullanicilara parayi esit dagitir. (Yetkili)")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Dagitilacak toplam para")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Liste mesaj ID (bos birakirsan son liste mesaji secilir)")
    ),

  async execute(interaction) {
    if (!(await ensureEconomyAdmin(interaction))) {
      return;
    }

    const distributionChannelId = getDistributionChannelId();

    if (!distributionChannelId) {
      const configEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Kanal Ayari Eksik`,
        description:
          "ECONOMY_DISTRIBUTION_CHANNEL_ID tanimli degil. .env dosyasina dagitim kanali IDsini ekle.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(configEmbed, true));
      return;
    }

    if (interaction.channelId !== distributionChannelId) {
      const channelEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Yanlis Kanal`,
        description: `Bu komut sadece <#${distributionChannelId}> kanalinda calisabilir.`,
        color: COLORS.warning
      });

      await interaction.reply(asReply(channelEmbed, true));
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const messageIdRaw = interaction.options.getString("message_id");

    if (messageIdRaw && !/^\d{17,20}$/.test(messageIdRaw)) {
      const idEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Gecersiz Mesaj ID`,
        description: "message_id alani sadece sayisal Discord mesaj IDsinden olusmalidir.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(idEmbed, true));
      return;
    }

    const sourceMessage = await getSourceMessage(interaction, messageIdRaw || null);

    if (!sourceMessage) {
      const sourceEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Liste Mesaji Bulunamadi`,
        description:
          "Dagitim yapilacak mesaj bulunamadi. message_id gir veya kanala @ ile liste mesaji yaz.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(sourceEmbed, true));
      return;
    }

    const sourceText = getMessageListText(sourceMessage);
    const mentionedMembers = [...(sourceMessage.mentions?.members?.values() || [])].filter(
      (member) => !member.user.bot
    );
    const mentionedUsers = [...(sourceMessage.mentions?.users?.values() || [])].filter(
      (user) => !user.bot
    );

    const targets = new Map();

    for (const member of mentionedMembers) {
      targets.set(member.id, member);
    }

    for (const user of mentionedUsers) {
      if (targets.has(user.id)) {
        continue;
      }

      const fetchedMember = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (fetchedMember && !fetchedMember.user.bot) {
        targets.set(fetchedMember.id, fetchedMember);
      }
    }

    if (targets.size === 0 && !sourceText.includes("@")) {
      const contentEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Gecersiz Liste Formati`,
        description:
          "Mesaj iceriginde/embedde en az bir @ satiri veya dogrudan kullanici mentioni olmali.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(contentEmbed, true));
      return;
    }

    const membersCollection = await interaction.guild.members.fetch();
    const members = [...membersCollection.values()].filter((member) => !member.user.bot);
    const unresolved = [];
    const ambiguous = [];

    const lines = sourceText.split(/\r?\n/);

    for (const line of lines) {
      const candidate = extractCandidateFromLine(line);
      if (!candidate) {
        continue;
      }

      const resolved = resolveByName(candidate, members);

      if (resolved.status === "found") {
        targets.set(resolved.member.id, resolved.member);
        continue;
      }

      if (resolved.status === "ambiguous") {
        ambiguous.push(candidate);
        continue;
      }

      if (resolved.status === "not_found") {
        unresolved.push(candidate);
      }
    }

    const targetMembers = [...targets.values()];

    if (targetMembers.length === 0) {
      const noneEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Hedef Kullanici Bulunamadi`,
        description:
          "Mesajdaki @ satirlarindan eslesen kullanici cikmadi. Kullanici adlarini kontrol et.",
        color: COLORS.warning
      });

      await interaction.reply(asReply(noneEmbed, true));
      return;
    }

    const perUserAmount = Math.floor(amount / targetMembers.length);
    const distributedTotal = perUserAmount * targetMembers.length;
    const remainder = amount - distributedTotal;

    if (perUserAmount < 1) {
      const tooSmallEmbed = createEconomyEmbed({
        interaction,
        title: `${ICONS.warn} Dagitim Icin Tutar Dusuk`,
        description: [
          `Toplam para: ${formatMoney(amount)}`,
          `Kisi sayisi: ${targetMembers.length}`,
          "Bu tutarda kisi basi 0 dusuyor. Daha yuksek amount gir."
        ].join("\n"),
        color: COLORS.warning
      });

      await interaction.reply(asReply(tooSmallEmbed, true));
      return;
    }

    for (const member of targetMembers) {
      addMoney(interaction.guildId, member.id, member.displayName, perUserAmount);
    }

    const preview = targetMembers
      .slice(0, 20)
      .map((member) => `${ICONS.user} ${member}`)
      .join("\n");

    const unresolvedText = unresolved.length > 0 ? unresolved.join(", ") : "-";
    const ambiguousText = ambiguous.length > 0 ? ambiguous.join(", ") : "-";

    const summary = createAsciiBox([
      `${ICONS.money} Toplam Girilen   : ${formatMoney(amount)}`,
      `${ICONS.user} Kisi Sayisi      : ${targetMembers.length}`,
      `${ICONS.wallet} Kisi Basi        : ${formatMoney(perUserAmount)}`,
      `${ICONS.money} Dagitilan Toplam : ${formatMoney(distributedTotal)}`,
      `${ICONS.info} Kalan (Dagitimsiz): ${formatMoney(remainder)}`,
      `${ICONS.info} Kaynak Mesaj ID   : ${sourceMessage.id}`
    ]);

    const successEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.ok} Dagitim Tamamlandi`,
      description: `${summary}\n\n${preview}`,
      color: COLORS.success,
      fields: [
        {
          name: `${ICONS.warn} Bulunamayan Satirlar`,
          value: unresolvedText.length > 1000 ? `${unresolvedText.slice(0, 970)}...` : unresolvedText
        },
        {
          name: `${ICONS.warn} Birden Fazla Eslesenler`,
          value: ambiguousText.length > 1000 ? `${ambiguousText.slice(0, 970)}...` : ambiguousText
        }
      ]
    });

    await interaction.reply(asReply(successEmbed, true));
  }
};
