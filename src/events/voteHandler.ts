import { EmbedBuilder, type MessageReaction, type User } from "discord.js";

export const handleVote = (reaction: MessageReaction, user: User) => {
	if (
		user.bot ||
		!(
			reaction.message.inGuild() &&
			(reaction.emoji.name === "✅" || reaction.emoji.name === "❌")
		)
	)
		return;

	const message = reaction.message;

	if (message.embeds.length === 0) return;

	const embed = message.embeds[0];

	if (!embed.description || !embed.description.startsWith("Total Votes:"))
		return;

	const yeses = (message.reactions.cache.get("✅")?.count ?? 1) - 1;
	const nos = (message.reactions.cache.get("❌")?.count ?? 1) - 1;

	const total = yeses + nos;
	let description = "Total Votes: 0\n\nNo one has voted";

	if (total > 0) {
		const yesBars = Math.floor(Math.round((yeses / total) * 100) / 10);
		const noBars = 10 - yesBars;

		description = `Total Votes: ${total}\n\n${yesBars * 10}% ${"🟩".repeat(yesBars)}${"🟥".repeat(noBars)} ${noBars * 10}%\n`;
	}

	const newEmbed = new EmbedBuilder({
		title: embed.title || "Poll",
		description,
		footer: { text: embed.footer?.text || "" },
	});

	message.edit({ embeds: [newEmbed] });
};
